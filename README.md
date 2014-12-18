## Simple image manipulator

Make your own coloring book or paint by numbers kit. This is very much a work in progress. 

This library can bring an image down to `k` number of median colors using k-means, and can then use an automaton based smoothing or a region-based smoothing to bring down the number of cells in the image to simplify more. Uses edge detection to show just the outlines of all regions. 

Uses a promise to make all steps more transparant.

Especially on larger images, this is not going to be fast. Look at the console to see progress. 

Todo:
- edge detection needs a bit of work. There seem to be occasional cells out of bounds.
- automaton smoothing, add cells pixels being 'born' also. 

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

The original. 

Brought back to 10 median colors

Smoothed over once, this creates a layered effect

Small cells are remove from the image

Display borders

Display borders only