// API gateway in front of the FastAPI prediction/persistence service.
//
// Plays the role WSO2 API Manager / Micro Integrator play in production:
// sits between the client and the backend, checks an API key, validates
// the request shape, forwards to the internal service, and normalizes
// errors — so the frontend never talks to the ML backend or PostgreSQL
// directly. It also relays the HttpOnly session cookie both directions so
// login state works without the browser ever seeing FastAPI.

import ballerina/http;
import ballerina/log;

configurable string backendUrl = "http://localhost:8000";
configurable string apiKey = "demo-secret-key-123";

// keepAlive is disabled: uvicorn closes idle keep-alive connections after a
// few seconds, and a pooled client reusing one right as it closes silently
// drops the request body. A fresh connection per call avoids that class of
// intermittent failure — an acceptable tradeoff at this traffic scale.
final http:Client backendClient = check new (backendUrl, httpVersion = http:HTTP_1_1, http1Settings = {keepAlive: http:KEEPALIVE_NEVER});

type MessageInput record {|
    string message;
|};

type AuthCredentials record {|
    string email;
    string password;
|};

function isValidApiKey(http:Request req) returns boolean {
    string|error suppliedKey = req.getHeader("x-api-key");
    return suppliedKey is string && suppliedKey == apiKey;
}

function jsonError(int statusCode, string message) returns http:Response {
    http:Response res = new;
    res.statusCode = statusCode;
    res.setJsonPayload({message: message});
    return res;
}

// Everything the browser needs to stay logged in travels as one Cookie
// header — forward it to the backend on every proxied call that might need
// to know who's asking.
function forwardedHeaders(http:Request req) returns map<string|string[]> {
    map<string|string[]> headers = {};
    string|error cookie = req.getHeader("Cookie");
    if cookie is string {
        headers["Cookie"] = cookie;
    }
    return headers;
}

// Relays status code, JSON body, and any Set-Cookie header(s) from a
// backend response onto a fresh gateway response.
function relayResponse(http:Response backendResp) returns http:Response {
    http:Response outResp = new;
    outResp.statusCode = backendResp.statusCode;

    string[]|http:HeaderNotFoundError setCookies = backendResp.getHeaders("Set-Cookie");
    if setCookies is string[] {
        foreach string cookieValue in setCookies {
            outResp.addHeader("Set-Cookie", cookieValue);
        }
    }

    json|error payload = backendResp.getJsonPayload();
    if payload is json {
        outResp.setJsonPayload(payload);
    } else {
        outResp.setJsonPayload({message: "backend returned a non-JSON response"});
    }
    return outResp;
}

// Like relayResponse, but for a non-JSON body (the CSV export) — copies the
// raw bytes, Content-Type, and Content-Disposition instead of assuming JSON.
function relayFileResponse(http:Response backendResp) returns http:Response {
    http:Response outResp = new;
    outResp.statusCode = backendResp.statusCode;

    if backendResp.statusCode >= 400 {
        return relayResponse(backendResp);
    }

    string|error contentType = backendResp.getHeader("Content-Type");
    string|error disposition = backendResp.getHeader("Content-Disposition");
    byte[]|error body = backendResp.getBinaryPayload();

    if body is byte[] {
        outResp.setBinaryPayload(body);
    }
    if contentType is string {
        outResp.setHeader("Content-Type", contentType);
    }
    if disposition is string {
        outResp.setHeader("Content-Disposition", disposition);
    }
    return outResp;
}

function proxyWithCookie(http:Request req, string method, string path) returns http:Response {
    map<string|string[]> headers = forwardedHeaders(req);
    http:Response|error backendResp;
    if method == "GET" {
        backendResp = backendClient->get(path, headers);
    } else if method == "DELETE" {
        backendResp = backendClient->delete(path, (), headers);
    } else {
        backendResp = backendClient->post(path, (), headers);
    }
    if backendResp is error {
        log:printError("backend call failed", 'error = backendResp);
        return jsonError(502, "backend unavailable");
    }
    return relayResponse(backendResp);
}

// PUT variant of proxyWithCookie that forwards the request body — used for
// PUT /messages/{id} (editing message text).
function proxyPutWithBody(http:Request req, string path) returns http:Response {
    map<string|string[]> headers = forwardedHeaders(req);
    json|error payload = req.getJsonPayload();
    if payload is error {
        return jsonError(400, "request body must be JSON");
    }
    http:Response|error backendResp = backendClient->put(path, payload, headers);
    if backendResp is error {
        log:printError("backend call failed", 'error = backendResp);
        return jsonError(502, "backend unavailable");
    }
    return relayResponse(backendResp);
}

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173", "https://mango-grass-0eaa0a500.7.azurestaticapps.net"],
        allowMethods: ["GET", "POST", "PUT", "DELETE"],
        allowHeaders: ["Content-Type", "x-api-key"],
        allowCredentials: true
    }
}
service / on new http:Listener(9000) {

    resource function get health() returns json {
        json|error backendHealth = backendClient->get("/health");
        if backendHealth is error {
            return {gateway: "online", backend: "unreachable", database: "unknown"};
        }
        string databaseStatus = "unknown";
        if backendHealth is map<json> {
            json? dbVal = backendHealth["database"];
            if dbVal is string {
                databaseStatus = dbVal;
            }
        }
        return {gateway: "online", backend: "online", database: databaseStatus};
    }

    resource function post predict(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            log:printWarn("rejected request: missing or invalid API key");
            return jsonError(401, "missing or invalid x-api-key header");
        }

        json|error payload = req.getJsonPayload();
        if payload is error {
            return jsonError(400, "request body must be JSON");
        }

        MessageInput|error input = payload.cloneWithType();
        if input is error || input.message.trim().length() == 0 {
            return jsonError(400, "field 'message' is required and must be non-empty");
        }

        map<string|string[]> headers = forwardedHeaders(req);
        log:printInfo("forwarding predict request to backend");
        http:Response|error backendResp = backendClient->post("/predict", {message: input.message}, headers);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "prediction backend unavailable");
        }
        return relayResponse(backendResp);
    }

    resource function post auth/register(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        json|error payload = req.getJsonPayload();
        if payload is error {
            return jsonError(400, "request body must be JSON");
        }
        AuthCredentials|error creds = payload.cloneWithType();
        if creds is error || creds.email.trim().length() == 0 || creds.password.length() == 0 {
            return jsonError(400, "fields 'email' and 'password' are required");
        }
        http:Response|error backendResp = backendClient->post("/auth/register", req);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "auth service unavailable");
        }
        return relayResponse(backendResp);
    }

    resource function post auth/login(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        json|error payload = req.getJsonPayload();
        if payload is error {
            return jsonError(400, "request body must be JSON");
        }
        AuthCredentials|error creds = payload.cloneWithType();
        if creds is error || creds.email.trim().length() == 0 || creds.password.length() == 0 {
            return jsonError(400, "fields 'email' and 'password' are required");
        }
        http:Response|error backendResp = backendClient->post("/auth/login", req);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "auth service unavailable");
        }
        return relayResponse(backendResp);
    }

    resource function post auth/logout(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "POST", "/auth/logout");
    }

    resource function get auth/me(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/auth/me");
    }

    // GET /messages?q=&classification=&sort=&limit=&offset= — query string
    // passthrough via req.rawPath, since this is the first GET route that
    // needs one (the older GET routes below take no query params).
    resource function get messages(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", req.rawPath);
    }

    resource function post messages(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        map<string|string[]> headers = forwardedHeaders(req);
        json|error payload = req.getJsonPayload();
        if payload is error {
            return jsonError(400, "request body must be JSON");
        }
        http:Response|error backendResp = backendClient->post("/messages", payload, headers);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "backend unavailable");
        }
        return relayResponse(backendResp);
    }

    resource function get messages/[string id](http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/messages/" + id);
    }

    resource function put messages/[string id](http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyPutWithBody(req, "/messages/" + id);
    }

    resource function delete messages/[string id](http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "DELETE", "/messages/" + id);
    }

    resource function get messages/[string id]/feedback(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/messages/" + id + "/feedback");
    }

    resource function post messages/[string id]/feedback(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        map<string|string[]> headers = forwardedHeaders(req);
        json|error payload = req.getJsonPayload();
        if payload is error {
            return jsonError(400, "request body must be JSON");
        }
        http:Response|error backendResp = backendClient->post("/messages/" + id + "/feedback", payload, headers);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "backend unavailable");
        }
        return relayResponse(backendResp);
    }

    resource function get feedback(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/feedback");
    }

    // Multipart CSV upload — forward the whole request (body + Content-Type
    // boundary) as-is, the same way auth/register already forwards `req`
    // wholesale rather than reconstructing a JSON payload.
    resource function post batch(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        http:Response|error backendResp = backendClient->post("/batch", req);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "backend unavailable");
        }
        return relayResponse(backendResp);
    }

    resource function get batch/[string id]/export(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        map<string|string[]> headers = forwardedHeaders(req);
        http:Response|error backendResp = backendClient->get("/batch/" + id + "/export", headers);
        if backendResp is error {
            log:printError("backend call failed", 'error = backendResp);
            return jsonError(502, "backend unavailable");
        }
        return relayFileResponse(backendResp);
    }

    resource function get dashboard(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/dashboard");
    }

    resource function get model(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/model");
    }

    resource function get admin/stats(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/admin/stats");
    }

    resource function get admin/users(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/admin/users");
    }

    resource function delete admin/users/[string id](http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "DELETE", "/admin/users/" + id);
    }

    resource function get admin/messages(http:Request req) returns http:Response {
        if !isValidApiKey(req) {
            return jsonError(401, "missing or invalid x-api-key header");
        }
        return proxyWithCookie(req, "GET", "/admin/messages");
    }
}
