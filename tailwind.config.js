/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Material Design 3 Palette
                primary: {
                    DEFAULT: '#D0BCFF', // M3 Dark Primary (Violet)
                    container: '#4F378B',
                    on: '#381E72',
                    onContainer: '#EADDFF',
                },
                secondary: {
                    DEFAULT: '#CCC2DC',
                    container: '#4A4458',
                    on: '#332D41',
                    onContainer: '#E8DEF8',
                },
                tertiary: {
                    DEFAULT: '#EFB8C8',
                    container: '#633B48',
                    on: '#492532',
                    onContainer: '#FFD8E4',
                },
                surface: {
                    DEFAULT: '#1C1B1F',
                    variant: '#49454F',
                    on: '#E6E1E5',
                    onVariant: '#CAC4D0',
                    container: {
                        lowest: '#0F0E11',
                        low: '#1D1B20',
                        DEFAULT: '#211F26',
                        high: '#2B2930',
                        highest: '#36343B',
                    }
                },
                outline: '#938F99',
                error: '#F2B8B5',
            },
            boxShadow: {
                // M3 Elevation Levels
                'm3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
                'm3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
                'm3-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
                'm3-4': '0px 2px 3px 0px rgba(0, 0, 0, 0.30), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
                'm3-5': '0px 4px 4px 0px rgba(0, 0, 0, 0.30), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
            },
            borderRadius: {
                'm3-full': '100px',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
        },
    },
    plugins: [],
};
