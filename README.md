## About this example repo

This is an example set up of how to use the javascript template ([rewired version](https://github.com/mu-semtech/mu-javascript-template/pull/68)) with vscode. With this setup, it has support for

- typescript debugging
- installing node modules with a merged package-lock.json of the service and the template
- proper typescript support for the mu package
- unit tests

And the things that the mu-javascript-template normally offers.

> [!IMPORTANT]
> Currently there is no feature branch in the javascript template with the rewired approach. You will have to build it yourself and call it e.g. local-js-template.

## Typescript debugging

The `.vscode/launch.json` file contains all you need to connect your vscode debugger to the node instance that is running in the container. There are a couple of particularities however.

1\. For your breakpoints to work, vscode needs to be able to map your built sources to the ones in the container. Therefore, we need to mount a dist directory that the template can write its built files to. This is done by the following volumes statements (see `docker-compose.debug.yml`):

```yaml
volumes:
  - /app/dist
  - ./dist:/usr/src/dist/
  # [...don't forget  to also add your sources and config of course]
  - ./:/app
  - ./config:/config
```

The first statement is important and makes it so that we don't add our dist folder to the `/app` directory again, creating an infinite loop. This was done so that we could keep the default mu-javascript-template setup of putting source files directly in the root of the service instead of in its own `src` folder, like is usually done in e.g. the react world.

2\. `NO_BABEL_NODE=true` as an environment variable. For some reason, vscode debugging does not work with the babel node command that is being run in the normal javascript template. Since everything has already been babelified when this command is run, I don't believe this is necessary though. So this environment variable makes the javascript template run a normal node command.

Don't forget to mount your sources and config, expose the debug port and run in `NODE_END=development` as usual.

## Installing node_modules and keep a merged package-lock.json

The javascript template installs a couple of dependencies of its own and includes the mu package that is not published on npm. This version of the javascript template keeps a package-lock.json file that you can include in the git repo of your service. The contents of this package-lock.json file is the combination of the template packages and the service packages (template package have priority, like in the regular js tempate).

You can install this by running `mu script install` (though this command is subject to change)

## Typescript support for mu package

If you install the node_modules using the method above, you'll already be rid of the red squiggly lines in your editor when you use the mu package. You can get the type declarations by adding this dependency in your dev dependencies:

```json
"devDependencies": {
  "mu-types": "git+https://github.com/rahien/mu-types.git",
}
```

## Unit tests

I believe the semantic.works stack lends itself much better to end-to-end tests for the services. However, if you want unit tests you can add them with any testing framework because we now have the full node_modules locally. I noticed that to get vitest working, you need to tell it where to find the `mu` module still because it's not in your package.json. To make that work, put this in your `vite.config.js`:

```js
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "mu", replacement: resolve(__dirname, "./node_modules/mu") },
    ],
  },
});
```

As we don't have a feature branch of the javascript template yet, having scripts in the CI would require ugly `docker run` commands. The current way around this is to put an extra layer in your service's docker file and run it during CI by building the image with all layers:

```Dockerfile
FROM semtech/mu-javascript-template:1.8.0 AS base
LABEL maintainer="you@example.com"
FROM base AS test
# added vitest as a dev dependency and since the template builds with NODE_ENV=production it's discarded
# need to run npm i again with NODE_ENV=test
RUN cd /usr/src/app/app/ && NODE_ENV=test npm i
RUN cd /usr/src/app/app/ && NODE_ENV=test npm run test
FROM base AS production
```

As the test layer is not used by the final layer, it is normally not built. You can then have the ci build all layers using `DOCKER_BUILDKIT=0 dr build -t local-service .` or the test layer specifically using `dr build --target=test -t local-service .`
