# traverse/reshape

`traverse()` and `reshape()` are companion functions that safely break down arrays or objects and put them back together in new shapes.

## Installation

Install the latest version with:

```bash
$ composer require alleyinteractive/traverse-reshape
```

## Basic usage

### traverse

Traverse an array or an object using a delimiter to find one value or many values.

```php
<?php

$arr = [
    'apples' => [
        'red' => [
            'gala',
            'mcintosh',
        ],
        'green' => [
            'granny_smith',
        ],
    ],
];

$obj = (object) [
    'apples' => (object) [
        'red' => [
            'gala',
            'mcintosh',
        ],
        'green' => [
            'granny_smith',
        ],
    ],
];


$green = \Alley\traverse($arr, 'apples.green');
// ['granny_smith']

$red = \Alley\traverse($obj, 'apples.red');
// ['gala', 'mcintosh']

[$red, $green] = \Alley\traverse($obj, ['apples.red', 'apples.green']);
// ['gala', 'mcintosh'], ['granny_smith']

[[$red, $green]] = \Alley\traverse(
    $obj,
    [
        'apples' => [
            'red',
            'green',
       ],
   ],
);
// ['gala', 'mcintosh'], ['granny_smith']
// note the extra depth of the return value -- values are nested according to the nesting of the given paths

[$red] = \Alley\traverse($obj, ['apples' => 'red']);
// ['gala', 'mcintosh']

$sweet = \Alley\traverse($arr, 'apples.green.sweet');
// NULL

$pears = \Alley\traverse($arr, 'pears');
// NULL

$req = getRemoteData();
[$title, $date] = \Alley\traverse($req, ['title', 'date']);
// $title and $date variables are guaranteed defined regardless of $req

[[$red, $green], $title] = \Alley\traverse(
    [$arr, $req],
    [
        '0.apples' => ['red', 'green'],
        '1.title',
   ]
);
```

### reshape

Declare the shape of a new array or object whose values are extracted from a source array or object with `traverse()`.

Shapes can be multidimensional. Paths that do not resolve in the source will be `null` in the result. If a path is given without a key, the key will be inferred from the path. Passing an object for a shape returns an object instead of an array.

```php
<?php

$original = [
    'id' => 1,
    'title' => [
        'rendered' => 'Hello world!',
    ],
    'content' => [
        'rendered' => '<p>Welcome to WordPress. This is your first post. Edit or delete it, then start writing!</p>',
    ],
    'categories' => [1],
    'tags' => [],
    '_links' => [
        'self' => [
            [
                'href' => 'https://www.example.com/wp-json/wp/v2/posts/1',
            ],
        ],
    ],
];

\Alley\reshape(
    $original,
    [
        'title' => 'title.rendered',
        'dek' => 'meta.dek',
        'content.rendered',
        'term_ids' => (object) [
            'category' => 'categories',
            'post_tag' => 'tags',
        ],
        'json' => '_links.self.0.href',
    ]
);

/*
    [
        'title' => 'Hello world!',
        'dek' => NULL,
        'rendered' => '<p>Welcome to WordPress...',
        'term_ids' => (object) [
            'category' => [1],
            'post_tag' => [],
        ],
        'json' => 'https://www.example.com/...',
    ]
*/
```

## About

### License

[GPL-2.0-or-later](https://github.com/alleyinteractive/traverse-reshape/blob/main/LICENSE)

### Maintainers

[Alley Interactive](https://github.com/alleyinteractive)
