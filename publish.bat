@echo off
vsce package || exit /b 1
vsce publish || exit /b 1