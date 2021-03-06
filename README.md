## Simple image manipulator

Make your own coloring book or paint by numbers kit. This is very much a work in progress. 

This library can bring an image down to `k` number of median colors using k-means, and can then use an automaton based smoothing or a region-based smoothing to bring down the number of cells in the image to simplify more. Uses edge detection to show just the outlines of all regions. 

Uses a promise to make all steps more transparant.

Especially on larger images, this is not going to be fast. Look at the console to see progress. 

Technical issues:
- edge detection needs a bit of work. There seem to be occasional cells out of bounds.
- determine the center of a cell
- automaton smoothing, add cells pixels being 'born' also. 
- optimize cell merging. cells should merge with either the largest neighbor or the neighbor closest in color. Haven't worked out yet how to determine neighboring cells.
- Once everything is working, I might check run time. 

Missing features:
- ability to display colors used
- ability to mark a cell with the number of the color used

## Example:

```javascript

var manipulator = Manipulator('house.jpg');

manipulator.then(function(image) {
    //display the working canvas in the dom
    //nice to see what's happening
    image.append();
    return image;
}).then(function(image) {
    //brings an image down to - in this case - 5 colors
    image.kmeans(5);
    return image;
}).then(function(image) {
    //automaton-based smoothing. one pass only, 
    //automatically converts a pixel to the color
    //of it's most numerous neighbor
    image.smoothing(1, 0);
    return image;
}).then(function(image) {
    //3 passes that merge all cells under 70 pixels
    image.mergeCells(3, 70)
    return image;
}).then(function(image) {
    //another cell merge, 2 passes to merge all cells under 100 px
    image.mergeCells(2, 100)
    return image;
}).then(function(image) {
    //display all edges, in black
    image.edges(false, [0,0,0])
    return image;
}).done(function(image) {
    //discard the canvas and display a png instead.
    image.convert();
    console.log('... the end')
})
```

## Outcomes

*note*: Because k-means adds some randomness, and because the screenshots below are taken from different runs, they differ slightly in shapes and colors (beyond the effect demonstrated).

The original. 

![Original](https://raw.githubusercontent.com/jorgt/manipulator/master/screenshots/1original.png)

Brought back to 10 median colors

![median](https://raw.githubusercontent.com/jorgt/manipulator/master/screenshots/2kmeans10.png)

Smoothed over once, this creates a layered effect

![smoothed](https://raw.githubusercontent.com/jorgt/manipulator/master/screenshots/3smoothed.png)

Small cells are removed from the image and merged into larger ones

![median](https://raw.githubusercontent.com/jorgt/manipulator/master/screenshots/4smallcells.png)

Display borders

![median](https://raw.githubusercontent.com/jorgt/manipulator/master/screenshots/5borders.png)

Display borders only

![median](https://raw.githubusercontent.com/jorgt/manipulator/master/screenshots/6bordersonly.png)