# Containerfile Guide

## Introduction

Creating a "bootable container" is a lot like creating a normal container image!

There are however only *a few* caveats which is outlined below.

### Treat the Containerfile like normal, except for...

* [ENTRYPOINT](https://github.com/containers/common/blob/4b53eca53c7a03b98161ae1727f4196517f5fcbc/docs/Containerfile.5.md?plain=1#L405) is ignored. You are "generating" a bootable container OS and `ENTRYPOINT` is meant for executables. You're building an entire OS instead!
* [CMD](https://github.com/containers/common/blob/4b53eca53c7a03b98161ae1727f4196517f5fcbc/docs/Containerfile.5.md?plain=1#L257) is also ignored. `CMD` provides the defaults for executing a container. Since you are booting into an entire OS, there is no need for `CMD`

### Most folders within `/` will be read-only for the bootable container OS.

With the concept of bootc, anything in `/`, `/usr` and below is meant to be **read-only** to make it immutable. However, there are two folders which will persistent any file changes.

Read only folders:
- `/*`: Most folders are to be read-only
- `/usr`: Mounted read-only by default on boot, but files can be added during build. Any binary or read-only files should be added. Example: Go binary, Python / Bash scripts.

Persistent across updates / reboots folders:
- `/etc`: Filesystem defaults that are to be persistent and writeable. Files such as network configuration file should be added here.
- `/var`: Machine-local data that will be persistent on update / reboot. **NOTE** This does NOT work at the moment due to [this PR](https://github.com/CentOS/centos-bootc/pull/186).

## Building the "OS" portion of your Containerfile

The first step is the "OS" portion! The part where you want to install default applications, setup SSH keys, create users, even change the password!

This can be done as easy as:

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc-dev:stream9
RUN echo "root:root" | chpasswd
```

Remember how only certain folders are writeable? Use `/etc` and `/var` folders for persistent files!

These only directories can be manipulated using your `Containerfile` when building the bootable container OS such as adding an SSH key:

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc-dev:stream9
COPY root.keys /usr/etc-system/root.keys
RUN touch /etc/ssh/sshd_config.d/30-auth-system.conf; \
    mkdir -p /usr/etc-system/; \
    echo 'AuthorizedKeysFile /usr/etc-system/%u.keys' >> /etc/ssh/sshd_config.d/30-auth-system.conf; \
    chmod 0600 /usr/etc-system/root.keys
```

This is because a bootable container is meant to be *updateable* and when a new image has been pushed and then pulled into your OS. Any files within `/` with the exception of `/etc/` and `/var` will be overridden by your updated container image you built.

### **Make sure your persistent files are located at /etc or /var! Or else they will be overridden!**

Once you boot your OS and you want a persistent file such as a picture of your pet or a `helloworld.py` example, you'll have to put your files within `etc` or `/var/` such as `/var/home/` and `/var/roothome`.

## Building the "application" part of the Containerfile

You've built the OS now, but you want your OS to automatically start an application on boot similar to a container.

How would you do that?

**With systemd unit files!** [Most operating systems](https://en.wikipedia.org/wiki/Systemd#Adoption) (and all bootc compatible images) images use systemd.

There are two ways you can do this, either:
* A **traditional method** using a standard systemd unit file
* Or the **immutable container / "podman quadlet"** method

### Traditional method


We'll start with an example of using a **normal** systemd file. This is **not** a recommended pattern as bootable containers are meant to be immutable, ideally you would want to launch a container, but you may want to do this for testing or developmental purposes.

The below example can also be found in the [bootc-helloworld-python-systemd](/examples/bootc-helloworld-python-systemd/) example directory.

Below we have three files:
- `helloworld.py`: a simple hello world Python HTTP file
- `helloworld.service`: a systemd unit file that runs the Python file
- `Containerfile`: our Containerfile that builds our OS and adds the systemd unit file.

1. Save the program below to `helloworld.py`:

```py
from http.server import BaseHTTPRequestHandler, HTTPServer

class HelloWorldHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b"Hello World!")

if __name__ == "__main__":
    server_address = ('', 8080)  # Serve on all addresses, port 8080
    httpd = HTTPServer(server_address, HelloWorldHandler)
    print("Starting httpd...")
    httpd.serve_forever()
```

2. Save the systemd unit file to `helloworld.service`

```sh
[Unit]
Description=Hello World HTTP Server
Wants=network.target
After=network.target

[Install]
WantedBy=default.target

[Service]
ExecStart=/usr/bin/python3 /usr/bin/helloworld.py
Restart=on-failure
```

3. Create the `Containerfile`:

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc-dev:stream9

# Add the systemd service
ADD helloworld.service /usr/lib/systemd/system/helloworld.service

# Enable the service
RUN systemctl enable helloworld

# Add the helloworld example
ADD helloworld.py /usr/bin/helloworld.py

# Change the root password so I can login to my test VM
RUN echo "root:root" | chpasswd
```

4. Follow the [usage steps](https://github.com/containers/podman-desktop-extension-bootc?tab=readme-ov-file#usage) to build your container

5. Confirm that it is working. Once you boot your container, login and `curl localhost:8080`. Your web server is running! You can also check the systemd status by doing `systemctl status helloworld`

### Immutable container / Podman Quadlet method

The **preferred** and immutable way is with [podman quadlets](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) which is a systemd auto-generation integration built into every OS that has `podman` installed. This adds the ability to create a systemd file with a podman compatible `[Container]` section. 

You can learn how to create a full `[Container]` section on the [podman site](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html).

The below example can also be found in the [bootc-helloworld-quadlet-container](/examples/bootc-helloworld-quadlet-container/) example directory.

Below we will have two files:
- `helloworld.container`: a podman quadlet systemd unit file that runs an http server
- `Containerfile`: our Containerfile that builds our OS and adds the systemd unit file

1. Save the systemd podman quadlet file to `helloworld.container`:

```sh
[Unit]
Description=Hello World HTTP server
Wants=network.target
After=network.target

[Container]
Image=quay.io/bootc-extension/helloworld
PublishPort=8080:8080

[Install]
WantedBy=default.target

[Service]
Restart=always
TimeoutStartSec=900
```

There are other non-official tools such as [podlet](https://github.com/k9withabone/podlet) that can automatically generate the systemd-compatible file from a `podman run` command which can help generate a file quicker.

2. Create the `Containerfile`:

```Dockerfile
FROM quay.io/centos-bootc/centos-bootc-dev:stream9

# Add the podman quadlet systemd service
ADD helloworld.container /usr/share/containers/systemd/helloworld.container

# Change the root password so I can login
RUN echo "root:root" | chpasswd
```

4. Follow the [usage steps](https://github.com/containers/podman-desktop-extension-bootc?tab=readme-ov-file#usage) to build your container

5. Confirm that it is working. Once you boot your container, login and `curl localhost:8080`. Your web server is running! You can also check the systemd status by doing `systemctl status helloworld`