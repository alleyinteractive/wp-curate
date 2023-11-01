# Changelog

All notable changes to `WP Curate` will be documented in this file.

## 1.4.2 - 2023-11-01

- Bug fix: PHP tax_query wants `AND` or `IN` for `operator`. REST API wants `AND` or `OR`.

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
