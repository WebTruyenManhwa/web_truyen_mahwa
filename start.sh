#!/bin/bash

# Dừng và xóa các container hiện có (nếu có)
docker-compose down

# Build và khởi động các container
docker-compose up --build