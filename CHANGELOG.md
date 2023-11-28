# Changelog

All notable changes to `WP Curate` will be documented in this file.

## 1.4.3 - 2023-11-28

- Bug fix: Adds in a temporary fix for https://github.com/alleyinteractive/alley-scripts/issues/473
- Bug fix: Lock [nunomaduro/collision](https://github.com/nunomaduro/collision) at v6.0. Fixes failing tests via Github Actions.

## 1.4.2 - 2023-11-01

- Bug fix: PHP tax_query wants `AND` or `IN` for `operator`. REST API wants `AND` or `OR`.
- Default operator should be `OR`/`IN`.

## 1.4.1 - 2023-11-01

- Bug fix: allow blocks when no post type is defined.

## 1.4.0 - 2023-10-30

- Bug fix: prevents error if `termRelations` attribute is not set.

## 1.3.0 - 2023-10-26

- Only show the blocks and register the meta on supported post types.
- Supported post types defaults to all Block Editor post types, but can be filtered by filtering `wp_curate_supported_post_types`.

## 1.2.0 - 2023-10-26

- Adds support for AND/OR operators in the Query Parameters, giving more control over what posts to show.

## 1.1.0 - 2023-09-21

- Bug fix: prevents error if post type does not support meta.

## 1.0.0 - 2023-09-19

- Initial release
