# Login & Authentication

Oasis Infobyte Internship (OIBSIP), Web Development & Designing, Level 2, Task 7.

A small Node.js server with registration, login and a protected dashboard. Password rule: at least 8 characters with at least 1 number. Login errors do not reveal which field is wrong. Logout clears the session. Passwords are hashed with scrypt and a random salt and stored in `data/users.json`. Sessions use an HttpOnly cookie. Needs Node.js 16+.

## How to run
```
node server.js
```
Then open http://localhost:3000.

## Screenshots
See the `screenshots/` folder.
