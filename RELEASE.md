# Release process for Podman Desktop Bootc Extension

## Pre-requisites

- Create Enhancement Issue `Release vX.X.X` for the current sprint, and assign it to yourself.
- Confirm with maintainers that pending / need-to-go-in PR's have been merged.
- Notify main contributors on Discord / Slack.

In the below example, we will pretend that we're upgrading from `1.1.0` to `1.2.0`. Please use the CORRECT release numbers as these are just example numbers.

## Releasing on GitHub

1. Go to https://github.com/containers/podman-desktop-extension-bootc/actions/workflows/release.yaml.
1. Click on the top right drop-down menu `Run workflow`.
1. Enter the name of the release. Example: `1.2.0` (DO NOT use the v prefix like v1.2.0)
1. Specify the branch to use for the new release. It's main for all major releases. For a bugfix release, you'll select a different branch.
1. Click on the `Run workflow` button.
1. Note: `Run workflow` takes approximately 2-3 minutes.
1. Make sure that all tasks for the respective release milestone are completed / updated, then close it. https://github.com/containers/podman-desktop-extension-bootc/milestones
1. If not already created, click on `New Milestone` and create a new milestone for the NEXT release.
1. Check that https://github.com/containers/podman-desktop-extension-bootc/actions/workflows/release.yaml has been completed.
1. Ensure the image has been successfully published to https://github.com/containers/podman-desktop-extension-bootc/pkgs/container/podman-desktop-extension-bootc.
1. There should be an automated PR that has been created. The title looks like `chore: 📢 Bump version to 1.3.0`. Rerun workflow manually if some of e2e tests are failing.
1. Wait for the PR above to be approved and merged before continuing with the steps.
1. Edit the new release https://github.com/containers/podman-desktop-extension-bootc/releases/edit/v1.2.0.
1. Select previous tag (v1.1.0) and click on `Generate release notes` and then click on `Update release`.

## Release testing

At this stage the release is not in the catalog, so clients will not automatically update to this version.

This allows QE (and everyone else) to test the release before it goes live.

❌ All severe bugs and regressions are investigated and discussed. If we agree any should block the release, we need to fix the bugs and do a respin of the release with a new .z release like 1.2.1 instead of 1.2.0.

- Create a branch if it does not exist. For example 1.2.1 if 1.2.0 failed. Then, cherry-pick bugfixes into that branch.

✅ If committers agree we have a green light, proceed.

## Publishing and updating the catalog

All steps above must be complete and successful before proceeding, including verifying the published images, testing, and green light!

1. Change the release in GitHub from 'pre-release' to 'latest release'.
1. Create and submit a PR to the catalog (https://github.com/containers/podman-desktop-catalog on branch gh-pages). This is manual and will be automated in the future.
