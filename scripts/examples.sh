#!/bin/bash

set -e

# Run all modules in examples/ directory
for file in examples/* examples/langchain/*; do 
    if [ -f "$file" ]; then
        echo "Running example $file"
        npx ts-node -r dotenv-flow/config "$file" > /dev/null
    fi 
done