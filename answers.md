# Nicholas Garner Final

## Part 1
---
### 1. Authentication vs. Authorization

Authentication involves confirming the identity of the user. Authorization involves determining what a user is allowed
to do and what resources they are allowed to access. A user that has been authenticated is not necessarily authorized
to perform a given action.

A request that does not contain valid credentials should return a `401` status code meaning that the user is not
authenticated. A `403` status code should be returned if an authenticated user is trying to perform an action
that they do not have permission to do.

### 2. Passwords, Sessions, and Tokens

An application should not store passwords as plain text in the event that a database is compromised. If the raw password
was stored, someone could log into the application pretending to be the user. If only the password hash is stored,
it prevents someone that gains access to the hash from gaining access to the plain text password.

A session based login stores information about the user on the server and sends a cookie to the client. The cookie is
sent with future requests, which the server then uses to retrieve information about the log in state. A token
based login does not change the state of the server. Instead, a signed token is sent with each request that the server
uses to identify the user. In summary, a session based login is stateful, while a token based login is stateless.

### 3. JSON Web Tokens

A JWT contains a header, payload, and signature. The header describes the algorithm used to encode the token. The
payload includes the claims about the user, such as their identity and role. Finally, the signature encodes the
header and payload using a secret key.

Signing the token does not hide the contents of the token. Anyone who intercepts a signed token can read the payload.
Encrypting the token hides the contents from anyone without the private keyt to decrypt it.

The server must validate the JWT using the signature since anyone can generate a token with any arbitrary claim.
The signature cannot be duplicated without the secret key.

One risk of using a JWT with a long expiration time is that someone who intercepts the token can continue to use it.
Limiting the duration of the token protects the user by making them log in to receive another token, invalidating 
previous tokens that may have been intercepted.

### 4. OAuth

OAuth allows a client application to access a resource on a resource owner's (the user) behalf without having the user's
password. The resource owner tells the authorization server to authorize the client to access the user's resources. The
authorization server then issues an access token to the client application, which the client application uses to access
the resource server.

An access token has an expiration date so that the client application does not have perpetual access to the user's
resources, unlike if the client application had the user's password.

### 5. PKI And Certificates

Certificates contain identity information about a server, such as domain and public key. Certificates are signed by
a certificate authority using the CA's private key, and the signature is used by the client along with the CA's public
key to prove that the server certificate is valid. After the certificate has been validated, the client will use the
server's public key provided in the certificate to encrypt data that it sends back to the server. If certificate
validation was skipped, the client could send data to an entity that was falsely claiming to be someone else.

### 6. Databases, Messages, and Asynchronous Processing

The API should use asynchronous processing so that it can response to other requests while the original report is still
being created. If the API was synchronous, many requests for a report can cascade and cause long delays for
later requests to be processed.

A producer will send a request to a message broker. The message broken will then add the message to a queue as well
as create a database entry for the request. The database entry can be used in the event that the original request fails.
In this event, the request can be read from the database and added back to the queue. A service can read the request
from the queue and assign a backgrond worker to work on executing the request and send an immediate HTTP response
to the client that signifies that the request is being handled. The client could make subsequent requests to the service
about the status of the original request.

A `202` status code can be returned for a job that is accepted but not acted upon. The server could respond with a
`200` status code for requests about the status of the operation.

## Part 2
---
### 1. Authentication and Authorization

| Request | Decision | Status Code |
| ------- | -------- | ----------- |
| A request contains no access token | Unauthorized | `401` |
| A request contains an expired JWT | Unauthorized | `401` |
| A student requests one of their own tasks | Return the task | `200` |
| A student requests another student’s task | Forbidden | `403` |
| An instructor requests a task belonging to any student | Return the task | `200` |

Authentication is used solely to determine the identity of the user making the request, and does not determine
what actions the user is allowed to take. Authorization determines what actions an authenticated user is allowed.

### 2. OAuth, JWT, PKI Design

The university's OAuth service would issue an access token to the client that would allow it to access the course API. 
The OAuth server signs the token with its private key and gives it to the client. The client then sends that
token with requests to the API. The API then checks the signature of the token against the public key for the
authorization server. The API shouldn't trust a role in the request body since that can be altered by the client.
Role information should only be trusted from the access token provided by the OAuth service, since that is
signed by the server and the API can know that it is valid.

### 3. Database and Asynchronous Report Processing

`POST /reports` could be used to generate a report for a particular student. A database record for the job could
look like 

```json
{
    "userId": "user_id",
    "jobId": "job_id_string",
    "status": "pending",
    "downloadUrl": null
}
```

The message placed on the queue would include the job id and user id

```json
{
    "jobId": "job_id_string",
    "studentId": "student_id"
}
```

The immediate HTTP response would include a `202` status code if the request was accepted, along with information about
the report

```json
{
    "jobId": "job_id_string",
    "status": "pending",
    "statusUrl": "/reports/job_id_string"
}
```

The method for checking the report status would be `GET` + the url returned by the report creation request, such as
`GET /reports/job_id_string`

The background worker would update the database entry with the success/fail status of the report generation as well
as the final report download url.

## Part 3
---
### 4. Error Classification
| Situation | Status Code |
| --------- | ----------- |
| No access token was provided | `401` |
| The JWT has expired | `401` |
| The JWT signature is invalid | `401` |
| A validly authenticated student attempts an instructor-only operation | `403` |

## Part 4
---
### 2. Database and Asynchronous Behavior

The task id is included as a parameter because the basic `GET /` route is used to get the identity information of the
user. Including the task id in the route creates a separate, distinct route that is dedicated to getting tasks.

Await must be used with db.query because the database query function is asynchronous and returns a promise if await
is not used. Await signals the program to wait for the query to finish so that it actually returns the data.

## Part 5
---
### 3. Queue Behavior

The API returns `202 Accepted` because it does not immediately complete the operation. It delegates the job to the
report creator. An advantage of this is that the server can process other requests while the report generator
works in the background.

## Part 7
---
### 1. Following a Request Through The System
The `GET /tasks/{id}` request is routed to the correct route handler for that HTTP method. Before any of the logic
inside the route handler is executed, the authentication and authorization middleware functions are executed.
The authentication function checks to see if a Bearer is present in the request. The token is then validated using the
JWT secret to determine the identity of the user. If the user could not be authenticated, a `401` error is returned.

After identity has been determined, the authorization middleware function checks if the user has the correct role to
access the route. The roles needed to access this particular route are `student` or `user`.

If the user is determined to have the correct role, the route logic can execute. The URL parameter is used to
query the database for a task. If that task is not owned by the user who made the rquest, or the user is not
an instructor, a `403` error is returned. If the task does not exist, a `404` error is returned. If the request was
successfull, a `200` status message is returned with the task json object.

### 2. Synchronous vs Asynchronous Processing
One operation that could be completed directly is a health check on the service. The service only needs to return a `200`
status code to the client if it is running.

An operation more suited to a message queue would be data compression. Depending on the algorithm, data compression can
be computationally expensive and take a long time to complete. The client could send a request to compress some piece of
data, and the server could immediately respond with a `202` status saying that it has started the job. A database
could be used to track the status of the job by storing the status and the compressed data download link. Failures
could be handled by marking the task as failed in the database. Tasks that fail could be reloaded into the message queue
for the background worker to attempt again.

### 3. Lessons Learned

The first practice I would recommend integrating into the API is authentication and authorization. If the API is
expected to be used by many users, it is critical to ensure that the users only have access to resources and actions
that they should be accessing. This prevents users from obtaining data that they should not have access to.

The next practice I would recommend is database integration. Database storage is persistent and does not disappear if
the server goes down. In addition, databases help make the service more scalable. If more than one server is running,
they likely both need access to the same data. Having only in-memory storage would make it difficult to scale the service.

Finally, if the service is expected to perform any operation that is computationally expensive, I would recommend using
asynchronous processing to offload the expensive parts of computation onto a background worker. The server could
accept the request from the user and create a job for the background worker to do. The server would then still be
avaialable to respond to subsequent requests from other users (or the same user) without being bogged down.