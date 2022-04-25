# unity-bundle-version

Node.js-based tool to modify the bundleVersion of a Unity project (`ProjectSettings/ProjectSettings.asset`).

Main use case is CI automation.

## Installation

unity-bundle-version is not on NPM, but you can install it from GitHub:

### Using npm with git

```bash
npm install -g git://github.com/kagekirin/unity-bundle-version.git
npm install -g git+ssh://git@github.com:kagekirin/unity-bundle-version.git
npm install -g git+https://git@github.com/kagekirin/unity-bundle-version.git
npm install -g git+ssh://git@github.com:kagekirin/unity-bundle-version.git[#<commit-ish>]
npm install -g git+ssh://git@github.com:kagekirin/unity-bundle-version.git[#semver:^x.x]
npm install -g github:kagekirin/unity-bundle-version[#<commit-ish>]
```

### Using npm with the tarball

```bash
npm install -g https://github.com/kagekirin/unity-bundle-version/tarball/main
```
