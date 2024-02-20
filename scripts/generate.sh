#!/bin/bash

source .env
SCHEMA_URL=$GENAI_DEFAULT_ENDPOINT/docs/json node ./scripts/generate.js