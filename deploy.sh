#!/bin/bash

command -v now >/dev/null 2>&1 || { echo >&2 "Error: Zeit's now is not installed."; exit 1; }

echo "Deploying with Zeit's now..."

now -e NODE_ENV="production"
