A `#region` with no matching `#endregion` has no end, so the include is dropped rather than pasting the rest of the file. Here `feed.sh` opens `#region feed` and never closes it. Add `#endregion feed` after the region's last line.

::incorrect
```md
:include{src="feed.sh" region="feed"}
```
::

::correct
```md
:include{src="deploy.sh" region="build"}
```
::
