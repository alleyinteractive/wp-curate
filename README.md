# WP Curate

[![All Pull Request Tests](https://github.com/alleyinteractive/wp-curate/actions/workflows/all-pr-tests.yml/badge.svg?branch=develop)](https://github.com/alleyinteractive/wp-curate/actions/workflows/all-pr-tests.yml)

A plugin for WordPress to build flexible, curatable layouts for homepages and landing pages.

WP Curate provides a new query block, which is a more powerful version of the Query Loop block available in WordPress's full site editor that is available on all pages, not just templates edited by the full site editor. Notable improvements include:

- The ability to include more than one post type in the results
- The ability to curate (pin) posts to any location in the results
- The ability to deduplicate posts across multiple query blocks on the same page

By using multiple query blocks on the same page, it is possible to create complex layouts featuring curated posts, recent posts, posts in specific categories, and more, all while ensuring that no post is repeated across multiple blocks.

## Features

### Curation

When adding a WP Curate Query block, editors can choose the number of posts to display, and can optionally select specific posts to appear in any of those locations. This is particularly useful if you have a section on the homepage that you want to retain full editorial control over, where you want to ensure that specific posts appear in specific locations.

### Automatic Backfill

By specifying post types and taxonomy terms, any WP Curate Query block can automatically display the latest posts that meet those criteria, whether curated posts are part of the block or not. This is useful for creating sections that display the latest posts in a specific category, tag, or custom taxonomy. Posts that are backfilled will be previewed in the editor, but will be grayed out to indicate that they are not curated. As new posts are published that meet the query criteria for backfill, they will automatically be displayed without having to edit the homepage or landing page again.

### Deduplication

WP Curate Query blocks can be set to deduplicate posts across multiple blocks on the same page. This ensures that no post is repeated across multiple blocks, even if it meets the criteria for multiple blocks.

### Flexible Templates

WP Curate Query blocks use the same Post Template block that the main Query Loop block uses, allowing for a wide range of layout options. This includes the ability to show or hide featured images, authors, excerpts, dates, and more.

### Parse.ly Support

WP Curate supports integration with Parse.ly for showing posts based on a Parse.ly popular posts query. This allows you to show popular posts on your homepage or landing page without having to manually curate them. As data is updated in Parse.ly, the posts displayed in the WP Curate Query block will automatically update.

## Screenshots

For an up-to-date gallery of screenshots of the plugin in action, see [the screenshots page on the WP Curate wiki](https://github.com/alleyinteractive/wp-curate/wiki/Screenshots).

## Requirements

WP Curate requires PHP 8.1+. It is developed for use on WordPress 6.4+.

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Credits

This project is actively maintained by [Alley](https://github.com/alleyinteractive).

Like what you see? [Come work with us](https://alley.com/careers/).

## License

The GNU General Public License (GPL) license. Please see [License File](LICENSE) for more information.
