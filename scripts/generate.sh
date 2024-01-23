#!/bin/bash

source .env
openapi-typescript $GENAI_DEFAULT_ENDPOINT/docs/json -o ./src/api/schema.d.ts