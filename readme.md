# Bundle size backend

Computes the size of NPM modules when they will be injected in a bundle, minified and gzipped. The single API entry point returns the size of the 3 last versions of the package, as well as the last version of the previous major.

## Make it work

### Run the server locally

Run the following commands in a terminal to run locally the server
```
yarn
yarn start
```

### Call from the frontend

```
http://localhost:8080/package-sizes?package=PACKAGE_NAME
```

## Computation

Creates an entry point file importing the desired package. The backend compiles then the entry file using a basic webpack configuration. Once compiled, the output bundle can then be sized and gzipped.

## Caching system

A simple caching system keeps in memory the sizes of the computed packages.

## Logging

Logs in `serverlogs.log`

## Improvements TODO

- Swagger specifications of the API to define the contract between backend and frontend. This would allow interfaces code generation and runtime calls validation.
- Create call endpoint allowing to specify the package and the version desired.
