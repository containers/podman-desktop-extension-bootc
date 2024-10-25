# Contributing

You can use `pnpm watch --extension-folder` from the Podman Desktop directory to automatically rebuild and test the bootc extension:

```sh
git clone https://github.com/containers/podman-desktop
git clone https://github.com/containers/podman-desktop-extension-bootc
cd podman-desktop
pnpm watch --extension-folder ../podman-desktop-extension-bootc/packages/backend
```

### Testing & Developing

Workflow for developing:

```sh
# Bootc root folder:
pnpm watch

# In a separate terminal in the Podman Desktop folder:
pnpm watch --extension-folder ../podman-desktop-extension-bootc/packages/backend
```

Workflow for testing and validation checking before PR submission:

```sh
# Tests
pnpm test

# Formatting, linting and typecheck
pnpm format:fix && pnpm lint:fix && pnpm typecheck
```
