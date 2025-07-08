<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Git_Manager_Utils {
	/**
	 * Sanitize and validate a git branch name
	 * @param string $branch
	 * @return string|false
	 */
	public static function sanitize_branch( $branch ) {
		$branch = trim( $branch );
		if ( preg_match( '/^[A-Za-z0-9._\/-]+$/', $branch ) ) {
			return $branch;
		}
		return false;
	}
}
