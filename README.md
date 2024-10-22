# Docker on Golem

## About this project

This project aims to build up a docker swarm that will utilize the resources rented from Providers available within the Golem Network.

THe general idea is that as a user of this project, you should be able to:

1. Request a defined amount of resources from the Providers on Golem Network
2. The tool will deploy and configure the Docker Swarm for you
3. You adda a `docker context` to your local Docker node
4. You execute docker based workloads on the swarm deployed on top of Golem Network's resources

## How to use it (as a Requestor)?

...

## How can I join the project as a Provider?

In order to become a Provider that's eligible (selectable), you will have to add few URLs to the whitelist on your provider nodes. You can use the following instructions.

### Provider Requirements

- Runtime name: `vm`
- Runtime version: `0.4.2`

...
