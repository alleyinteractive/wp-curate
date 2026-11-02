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

namespace Alley\Internals;

/**
 * Contains the implementation details for the `traverse()` functions.
 *
 * Internals are not subject to semantic-versioning constraints.
 */
final class Traverser
{
    /**
     * Data source.
     *
     * @var array|object
     */
    private $source;

    /**
     * Path or array of paths to data.
     *
     * @var array|string
     */
    private $path;

    /**
     * Path delimiter.
     *
     * @var string
     */
    private string $delimiter;

    /**
     * Found result.
     *
     * @var mixed
     */
    private $result = null;

    /**
     * Constructor.
     *
     * @param array|object $source Data source.
     * @param string|array $path The path or array of paths.
     * @param string $delimiter Delimiter.
     */
    public function __construct($source, $path, string $delimiter)
    {
        $this->source = $source;
        $this->path = $path;
        $this->delimiter = $delimiter;
    }

    /**
     * Create an instance and return the traversed value.
     *
     * @param mixed ...$args Constructor arguments.
     * @return mixed
     */
    public static function createAndGet(...$args)
    {
        $instance = new self(...$args);
        return $instance->get();
    }

    /**
     * Get the traversed value.
     *
     * @return mixed
     */
    public function get()
    {
        $this->run();

        return $this->result;
    }

    /**
     * Run the traversal.
     */
    private function run()
    {
        if (\is_array($this->path)) {
            $this->result = array_reduce(array_keys($this->path), [$this, 'reducePaths'], []);
            return;
        }

        if (!\is_string($this->path) && !\is_int($this->path)) {
            return;
        }

        /*
         * Convert the path supplied to this instance into an array using the
         * delimiter supplied by this instance:
         *
         * - `0` becomes `[ 0 ]`
         * - `foo` becomes `[ 'foo' ]`
         * - `foo.bar` becomes `[ 'foo', 'bar' ]` if the delimiter is `.`
         */
        $path_pieces = explode($this->delimiter, $this->path);

        /*
         * Take the first element from the newly generated array of path pieces,
         * and use it as a key to try to find the matching value in the source
         * data supplied to this instance. If there is no matching array key or
         * object property in the source data, stop.
         */
        $key = array_shift($path_pieces);

        if (\is_array($this->source) || $this->source instanceof \ArrayAccess) {
            if (!isset($this->source[$key])) {
                /*
                 * `isset()` is used instead of `array_key_exists()` for
                 * compatibility with `\ArrayAccess`. Nothing is lost by the
                 * fact that `isset()` returns false for a null value because
                 * the default value for `$result` is also null, and attempting
                 * to continue traversing null would still return null.
                 */
                return;
            }

            $this->result = $this->source[$key];
        } elseif (\is_object($this->source)) {
            if (!isset($this->source->{$key})) {
                return;
            }

            $this->result = $this->source->{$key};
        }

        // If there are no more path pieces left to traverse, stop.
        if (0 === \count($path_pieces)) {
            return;
        }

        /*
         * Otherwise, there are more pieces left from the path supplied to the
         * instance. Traverse the value found for the previous key, using the
         * remaining path pieces and the delimiter to create a new string path.
         * This process repeats until there are no more path pieces.
         */
        $this->result = self::createAndGet($this->result, implode($this->delimiter, $path_pieces), $this->delimiter);
    }

    /**
     * `array_reduce()` callback to reduce an array of paths into the array of values.
     *
     * @param array $carry Traversal result.
     * @param string|int $key Key in the array of paths to fetch.
     * @return array Updated array of results.
     */
    private function reducePaths(array $carry, $key): array
    {
        $source = $this->source;

        /*
         * If the key is a non-numeric string, traverse the value in the
         * original source at the path specified by the key.
         */
        if (!is_numeric($key)) {
            $source = self::createAndGet($source, $key, $this->delimiter);
        }

        $carry[] = self::createAndGet($source, $this->path[$key], $this->delimiter);

        return $carry;
    }
}
