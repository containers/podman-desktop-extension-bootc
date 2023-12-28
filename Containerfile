#
# Copyright (C) 2024 Red Hat, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

FROM scratch as builder
COPY dist/ /extension/dist
COPY package.json /extension/
COPY LICENSE /extension/
COPY icon.png /extension/
COPY README.md /extension/


FROM scratch

LABEL org.opencontainers.image.title="Boot-c extension" \
        org.opencontainers.image.description="Boot-c extension" \
        org.opencontainers.image.vendor="Red Hat" \
        io.podman-desktop.api.version=">= 1.6.0"

COPY --from=builder /extension /extension
