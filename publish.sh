#!/bin/bash
set -e

vsce package
vsce publish -p "$VSCE_TOKEN"
ovsx publish -p "$OVSX_TOKEN"

