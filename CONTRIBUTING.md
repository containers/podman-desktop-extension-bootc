# Contributing

You can use `yarn watch --extension-folder` from the Podman Desktop directory to automatically rebuild and test the bootc extension:

```sh
git clone https://github.com/containers/podman-desktop
git clone https://github.com/containers/podman-desktop-extension-bootc
cd podman-desktop
yarn watch --extension-folder ../podman-desktop-extension-bootc/packages/backend
```

### Testing & Developing

Workflow for developing:

```sh
# Bootc root folder:
yarn watch

# In a separate terminal in the Podman Desktop folder:
yarn watch --extension-folder ../podman-desktop-extension-bootc/packages/backend
```

Workflow for testing and validation checking before PR submission:

```sh
# Tests
yarn test

# Formatting, linting and typecheck
yarn format:fix && yarn lint:fix && yarn typecheck
```