# Torched-Hospital-Affiliation-Graph
Hospital affiliation graph created for Torched June 2018

## Setup
Add a file named `credentials.json` to the root folder of the repo in this format (with your Torch credentials):
```
{
    "email":"XXXXX",
    "password":"XXXXX"
}
```
You have to set up a local http server to run the viz locally. This can be done easily with python:
```
#Python 3
python -m http.server

#Python 2
python -m SimpleHTTPServer
```