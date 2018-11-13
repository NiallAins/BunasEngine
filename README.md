# About
**Bunas** is a HTML5 game engine written in Typescript.
The aim of **Bunas** is to facilitate the development of interactive Typescipt or Javascript applications using HTML5 Canvas.

## Project strucutre
This project contains both the engine modules which make up **Bunas**, and the documentation and support site.
The root project contains the following folders:

### Dist
This contains the boilerplate code for creating a Typescript project with **Bunas**.  
This folder contains a `tsconfig` file which will watch for any changes to files you edit in `dev`, and automatically compile them to `./dist/src.js`.

### Docs
This contains markup files which make up the project documentation, and the static site created from these files.

### Modules
Here lies the **Bunas** engine typescript code, split into specilised modules.  
When these modules are built, they will be compiled, combined, and then placed into `./dist/dev` to be used in a **Bunas** project.

These modules are:
- *Engine* - all code for initalising and running the application loop and state
- *Core* - common code for all modules
- *Debug* - features to help in debugging a **Bunas** app
- *Graphics* - functions to help with animations and visual effects
- *Input* - functions to deal with user input
- *Physics* - functions to deal with vectors and adding Physics
- *World* - features to control game levels, views and areas

# Creating a Project with Bunas
If you wish to create a project with **Bunas**, you will only need to clone the `./dist` folder of this repository.  
To start development, run the following commands:
```
    npm install -g typescript
    tsc -w
```

You can now start editing `dev/main.ts` or adding your own modules to the folder `dev` and every change will automatically compile into `dist/src.js`.  
Open `dist/index.html` to see your project running.  

To deploy your completed project, the only files you need to export are `dist/index.html` and `dist/src.js`.

# Developing Bunas
If you wish to develop or change the **Bunas** engine itself, first clone this project, then run the following commands:
```
    npm install
    npm install -g typescript
    gulp
```

Now any changes made to the **Bunas** files in `./modules` will be automatically compiled to `./dist/dev/Bunas.ts`.
Any changes to the documentation markdown files will be automatically compiled to html pages.