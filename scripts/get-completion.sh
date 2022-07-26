#!/bin/bash
source $(dirname $0)/west-completion.bash
COMP_WORDS=("$@")
COMP_CWORD=$(( ${#COMP_WORDS[@]} - 1 ))
__comp_west
echo "${COMPREPLY[*]}"
