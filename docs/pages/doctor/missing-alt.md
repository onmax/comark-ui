An image whose alt text is empty. Screen readers skip it or read out its file name, and a reader whose image doesn't load sees nothing. Write what the image shows, the way you'd tell someone who can't see it. An image that's only decoration takes `{alt=""}`, which tells screen readers to skip it on purpose.

::incorrect
```md
![](https://example.com/pigeons.png)
```
::

::correct
```md
![Three pigeons on the station roof](https://example.com/pigeons.png)
```
::
