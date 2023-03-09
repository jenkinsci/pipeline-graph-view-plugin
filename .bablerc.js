const plugins = [
    [
        'babel-plugin-import',
        {
            libraryName: '@mui/material',
            libraryDirectory: '',
            camel2DashComponentName: false,
        },
        'core',
    ],
    [
        'babel-plugin-import',
        {
            libraryName: '@mui/icons-material',
            libraryDirectory: '',
            camel2DashComponentName: false,
        },
        'icons',
    ],
    [
        'babel-plugin-import',
        {
        libraryName: '@mui/lab',
        libraryDirectory: '',
        camel2DashComponentName: false,
        },
        'lab',
    ]
];

module.exports = { plugins };  
