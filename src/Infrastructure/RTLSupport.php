<?php

namespace WPGitManager\Infrastructure;

/**
 * RTL Support Utility Class
 * Handles RTL language detection and support functionality
 */
class RTLSupport
{
    /**
     * RTL languages list
     */
    private static $rtlLanguages = [
        'ar', // Arabic
        'he', // Hebrew
        'fa', // Persian/Farsi
        'ur', // Urdu
        'ps', // Pashto
        'sd', // Sindhi
        'yi', // Yiddish
        'ku', // Kurdish
        'dv', // Divehi
        'ckb', // Central Kurdish
    ];

    /**
     * Check if current locale is RTL
     */
    public static function isRTL()
    {
        $locale = get_locale();

        if (is_rtl()) {
            return true;
        }

        foreach (self::$rtlLanguages as $lang) {
            if (0 === strpos($locale, (string) $lang)) {
                return true;
            }
        }

        return false;
    }

    public static function getCurrentLocale()
    {
        return get_locale();
    }

    public static function getRTLAttributes()
    {
        $locale = self::getCurrentLocale();
        $isRTL  = self::isRTL();

        if ($isRTL) {
            return 'dir="rtl" lang="' . esc_attr($locale) . '"';
        }

        return 'dir="ltr" lang="' . esc_attr($locale) . '"';
    }

    public static function getRTLClasses()
    {
        $classes = ['repo-manager-wrap'];

        if (self::isRTL()) {
            $classes[] = 'repo-manager-rtl';
        }

        return implode(' ', $classes);
    }

    public static function getRTLDataAttributes()
    {
        $isRTL  = self::isRTL();
        $locale = self::getCurrentLocale();

        return sprintf(
            'data-rtl="%s" data-locale="%s"',
            $isRTL ? 'true' : 'false',
            esc_attr($locale)
        );
    }

    public static function getTextDirection()
    {
        return self::isRTL() ? 'rtl' : 'ltr';
    }

    public static function getAlignmentClass($defaultAlignment = 'left')
    {
        if (self::isRTL()) {
            return 'left' === $defaultAlignment ? 'text-right' : 'text-left';
        }

        return 'left' === $defaultAlignment ? 'text-left' : 'text-right';
    }

    public static function getSpacingDirection($side)
    {
        if (self::isRTL()) {
            switch ($side) {
                case 'left':
                    return 'right';
                case 'right':
                    return 'left';
                default:
                    return $side;
            }
        }

        return $side;
    }

    public static function getFlexDirection($defaultDirection = 'row')
    {
        if (self::isRTL() && 'row' === $defaultDirection) {
            return 'row-reverse';
        }

        return $defaultDirection;
    }

    public static function getIconClass($position = 'left')
    {
        if (self::isRTL()) {
            return 'left' === $position ? 'git-icon-right' : 'git-icon-left';
        }

        return 'left' === $position ? 'git-icon-left' : 'git-icon-right';
    }

    public static function getRTLanguages()
    {
        return self::$rtlLanguages;
    }

    public static function isLanguageRTL($language)
    {
        return in_array($language, self::$rtlLanguages);
    }

    public static function getRTLSettings()
    {
        return [
            'isRTL'        => self::isRTL(),
            'locale'       => self::getCurrentLocale(),
            'direction'    => self::getTextDirection(),
            'rtlLanguages' => self::$rtlLanguages,
        ];
    }

    public static function getRTLCSSVariables()
    {
        $isRTL = self::isRTL();

        return [
            '--gm-direction'      => $isRTL ? 'rtl' : 'ltr',
            '--gm-text-align'     => $isRTL ? 'right' : 'left',
            '--gm-flex-direction' => $isRTL ? 'row-reverse' : 'row',
            '--gm-margin-start'   => $isRTL ? 'margin-right' : 'margin-left',
            '--gm-margin-end'     => $isRTL ? 'margin-left' : 'margin-right',
            '--gm-padding-start'  => $isRTL ? 'padding-right' : 'padding-left',
            '--gm-padding-end'    => $isRTL ? 'padding-left' : 'padding-right',
        ];
    }

    public static function getRTLCSSVariablesString()
    {
        $variables = self::getRTLCSSVariables();
        $css       = '';

        foreach ($variables as $property => $value) {
            $css .= $property . ': ' . $value . ';';
        }

        return $css;
    }

    public static function getRTLInlineStyles()
    {
        $variables = self::getRTLCSSVariables();
        $styles    = '';

        foreach ($variables as $property => $value) {
            $styles .= $property . ': ' . $value . '; ';
        }

        return $styles;
    }

    public static function getRTLWrapperAttributes()
    {
        $attributes     = self::getRTLAttributes();
        $classes        = self::getRTLClasses();
        $dataAttributes = self::getRTLDataAttributes();
        $styles         = self::getRTLInlineStyles();

        return sprintf(
            '%s class="%s" %s style="%s"',
            $attributes,
            $classes,
            $dataAttributes,
            $styles
        );
    }
}
