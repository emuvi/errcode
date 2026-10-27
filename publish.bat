@echo off
call vsce package || exit /b 1
call vsce publish -p %VSCE_TOKEN% || exit /b 1
call ovsx publish -p %OVSX_TOKEN% || exit /b 1


