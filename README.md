Demo, dumping the interleaving schedule for a file.

Note that empty buffers are dumped as newlines, this is not an exact dump.

```sh
> node bin/plan.js test/fixture/single-script.html
/single-script.html:: <script src=index.js>
/index.js:: import './foo.js';
/foo.js:: import './index.js';
/foo.js::
/foo.js:: console.log('FOO');
/index.js::
/index.js::
/single-script.html:: </script>
/single-script.html::
/single-script.html:: <link rel=stylesheet href=index.css>
/index.css:: @import '//google.com/style.css';
/a.css:: @import 'index.css';
/a.css:: body { color: red};
/index.css::
/index.css:: @import url('a.css');
/single-script.html::
/single-script.html::
/single-script.html::
```

TODO:

* npm style package imports
* better css interleaving by putting interleaving after `@import`

