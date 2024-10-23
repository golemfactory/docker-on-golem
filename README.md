# Docker on Golem

<!-- TOC -->

- [Docker on Golem](#docker-on-golem)
    - [About this project](#about-this-project)
    - [Usage Guide](#usage-guide)
        - [Installation](#installation)
        - [Deployment](#deployment)
    - [Provider Information](#provider-information)
        - [Requirements](#requirements)
        - [Whitelist Configuration](#whitelist-configuration)

<!-- TOC -->

## About this project

This project aims to build a Docker Swarm utilizing resources rented from Providers on the Golem Network. As a user, you
can:

1. Request resource allocation from Golem Network Providers.
2. Deploy and configure a Docker Swarm using this tool.
3. Add a `docker context` to your local Docker node.
4. Execute Docker workloads on the Swarm deployed on Golem Network's resources.

## Usage Guide

### Installation

After installing yagna on your system by following the [official installation guide][yagna-install-guide]:

```bash
npm i -g docker-on-golem@latest
```

Once installed, explore the available options using the help command:

```bash
docker-on-golem --help
```

### Deployment

Deploy your Docker Swarm using the following command:

```bash
docker-on-golem -k [your-yagna-app-key]
# Additional options are available; use --help to explore possibilities
```

To add a new Docker context pointing to the Swarm deployed on Golem Network:

```bash
docker context create golem-swarm --docker "host=tcp://localhost:3375"
docker context use golem-swarm
```

You should now be able to use `docker`, `docker compose`, or `docker stack` in this setup.

## Provider Information

### Requirements

- Runtime name: `vm`
- Runtime version: `0.4.2`

### Whitelist Configuration

Add outbound URLs to the whitelist:

```bash
# Allow internet access to everyone, but restricted to the whitelist
ya-provider rule set outbound everyone --mode whitelist
# Add the Docker registry to the whitelist
ya-provider whitelist add -p registry-1.docker.io -t strict
```

You can check if everything is set with these commands

```bash
# Here, you should see the Everyone/whitelist entry
ya-provider rule list

# Here you should see the entry on the whitelist
ya-provider whitelist list
```

[yagna-install-guide]: https://docs.golem.network/docs/quickstarts/js-quickstart#installing-and-running-yagna-4