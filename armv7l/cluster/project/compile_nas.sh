#!/bin/bash
for bench in ft ep mb; do
    for class in S W A B C D E F; do
        make $bench CLASS=$class
    done
done