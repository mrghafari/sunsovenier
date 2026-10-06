---
name: Department middleware typing
description: TypeScript compatibility when composing department authorization middleware in Express routes.
---

When composing `attachUserDepartments` and `requireDepartment` in an Express route, adapt both middleware functions to Express `RequestHandler` at the route boundary.

**Why:** Their authenticated request type narrows `req.user` differently from the application's ambient Express request type. Express overload resolution can reject a newly composed route even though the middleware behavior is valid.

**How to apply:** Keep the narrow middleware types internally, but explicitly adapt both handlers where they are passed to `app.get`, `app.post`, or similar route registration methods.