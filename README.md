# `bruin-setup-action`
This [Action] installs the [`bruin`][bruin-cli] CLI in your GitHub Actions pipelines so that it can be
used by other Bruin Actions:


After `bruin-setup-action` is run, the `bruin` command is available to other Actions in the pipeline's
`PATH`. You can also use the `bruin` command directly inside of workflow steps.

## Usage

Here's an example usage of `bruin-setup-action`:

```yaml
steps:
  # Run `git checkout`
  - uses: actions/checkout@v2
  # Install the `bruin` CLI
  - uses: bruin-data/bruin-setup-action@main
  # Ensure that `bruin` is installed
  - run: bruin --version
```

## Configuration

### Input

You can configure `bruin-setup-action` with these parameters:

| Parameter      | Description                                        | Default            |
|:---------------|:---------------------------------------------------|:-------------------|
| `version`      | The version of the [`bruin` CLI][bruin-cli] to install | [`latest`][version] |

> These parameters are derived from [`action.yml`](./action.yml). <br>
#### Version

If `version` is unspecified, the latest version of `bruin` is installed:

```yaml
steps:
  - uses: actions/checkout@v2
  # Installs latest
  - uses: bruin-data/bruin-setup-action@main
  - run: bruin --version
```

Use the `version` parameter to pin to a specific version:

```yaml
steps:
  - uses: actions/checkout@v2
  # Installs version 0.11.52
  - uses: bruin-data/bruin-setup-action@main
    with:
      version: 0.11.52
  # Should output 0.11.52
  - run: bruin --version
```

To resolve the latest release from GitHub, you can specify `latest`, but this is **not**
recommended:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: bruin-data/bruin-setup-action@main
    with:
      version: latest
  - run: bruin --version
```

For more example, please check the repository [y-bruin/bruin-dev](https://github.com/y-bruin/bruin-dev).