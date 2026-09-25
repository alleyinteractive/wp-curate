<?php

/*
 * This file is part of the traverse/reshape package.
 *
 * (c) Alley <info@alley.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace Alley;

/**
 * Reshape an array or object into new keys with values traversed from within the original.
 *
 * @param array|object $source Data source.
 * @param array|object $shape An array or object of the new keys for the data and the paths to traverse in
 *                            the source data to find the new values. Multidimensional values can be created
 *                            by passing a fully-formed shape as a value in the array or object. A string value
 *                            without a named key will use the final segment of the string as the key and the
 *                            full string path as the value.
 * @param string $delimiter Delimiter. Default is a '.'.
 * @return array|object A new associative array or object from the keys and traversal paths of $shape.
 */
function reshape($source, $shape, string $delimiter = '.')
{
    /*
     * If a string is included in $shape without a string key, use the last segment
     * of the string as the reshaped key and the full string as the path.
     */
    $final = array_reduce(
        array_keys((array) $shape),
        function ($carry, $key) use ($shape, $delimiter) {
            $path = traverse($shape, (string) $key);

            if (\is_int($key)) {
                $key_pieces = explode($delimiter, $path);
                $key = array_pop($key_pieces);
            }

            // Later keys replace earlier ones but remain in their given position in the shape.
            unset($carry[$key]);

            return $carry + [$key => $path];
        },
        []
    );

    // Create the desired shape now to preserve the order of its keys during the final merge.
    $out = array_fill_keys(array_keys($final), null);

    // Key-value pairs for values that are strings and can be traversed in bulk.
    $deferred = [];

    foreach ($final as $key => $path) {
        if (\is_string($path)) {
            $deferred[$key] = $path;
        } else {
            // Fill in nested arrays now.
            $out[$key] = reshape($source, $path, $delimiter);
        }
    }

    // Merge the remaining keys on top.
    $out = array_merge(
        $out,
        array_combine(
            array_keys($deferred),
            traverse($source, array_values($deferred), $delimiter)
        )
    );

    return \is_object($shape) ? (object) $out : $out;
}
