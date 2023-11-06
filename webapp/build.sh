#!/bin/bash

cd $(dirname $0)
bun build --watch script.tsx --outdir build
