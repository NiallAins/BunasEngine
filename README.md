# About
**Bunas** is a HTML5 game engine written in Typescript.
The aim of **Bunas** is to facilitate the development of interactive Typescipt or Javascript applications using HTML5 Canvas.

## Project strucutre
This project contains both the engine modules which make up **Bunas**, and the documentation and support site.
The root project contains the following folders:

### Dist
This contains the boilerplate code for creating a Typescript project with **Bunas**, including the compiled and minified **Bunas** engine code and a `.tsconfig` setup.

### Docs
This contains the `.MD` markup files which make up the documentation, and the static site created from these files.

### Modules
Here lies the Bunas engine typescript code, split into specilised modules. When these modules are built, they will be compiled, combined, and then placed into the `dist` folder to be used in **Bunas** projects.

These modules are:
- *Engine*: all code for initalising and running the application loop and state
- *Core*: common code for all modules
- *Debug*: features to help in debugging a **Bunas** app
- *Graphics*: functions to help with animations and visual effects
- *Input*: functions to deal with user input
- *Physics*: functions to deal with vectors and adding Physics
- *World*: features to control game levels, views and areas

# Developing Bunas

# Creating a project with Bunas
