# Docker on Golem

<!-- TOC -->

- [Docker on Golem](#docker-on-golem)
  - [About this project](#about-this-project)
  - [How to use it (as a Requestor)?](#how-to-use-it-as-a-requestor)
    - [Installation](#installation)
    - [Usage](#usage)
  - [How can I join the project as a Provider?](#how-can-i-join-the-project-as-a-provider)
  _ [Provider Requirements](#provider-requirements)
  _ [Add outbound URLs to whitelist](#add-outbound-urls-to-whitelist)
  <!-- TOC -->

## About this project

This project aims to build up a docker swarm that will utilize the resources rented from Providers available within the Golem Network.

THe general idea is that as a user of this project, you should be able to:

1. Request a defined amount of resources from the Providers on Golem Network
2. The tool will deploy and configure the Docker Swarm for you
3. You adda a `docker context` to your local Docker node
4. You execute docker based workloads on the swarm deployed on top of Golem Network's resources

## How to use it (as a Requestor)?

### Installation

After you have installed yagna on your system by following the [official installation guide](https://docs.golem.network/docs/quickstarts/js-quickstart#installing-and-running-yagna-4).

```bash
npm i -g docker-on-golem@latest
```

Once you installed the tool, you can explore the available options using the help command

```bash
docker-on-golem --help
```

### Usage

You can deploy your Docker Swarm using the following command:

```bash
docker-on-golem -k [your-yagna-app-key]
# You can use more options to fine tune the setup, check --help to explore the possibilities
```

Then, you can add a new docker context to your local docker configuration, to point the CLI to the swarm deployed on top of Golem Network:

```bash
docker context create golem-swarm --docker "host=tcp://localhost:3375"
docker context use golem-swarm
```

Now you should be able to use `docker`, `docker compose` or `docker stack` with this cluster.

## How can I join the project as a Provider?

In order to become a Provider that's eligible (selectable), you will have to add few URLs to the whitelist on your provider nodes. You can use the following instructions.

### Provider Requirements

- Runtime name: `vm`
- Runtime version: `0.4.2`

### Add outbound URLs to whitelist

```bash
ya-provider whitelist add -p registry-1.docker.io -t strict
```

...
