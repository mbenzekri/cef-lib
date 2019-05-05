/* eslint-disable no-template-curly-in-string */
import Batch from './index';

const cebfile = {
    name: 'Testing cloud batch',
    title: 'Go! Go! Go!!! ',
    globals: {
        PATH: 'D:/data/GEOFLA',
    },
    steps: [
        {
            id: 'a',
            gitid: 'DirectoryWalker@mbenzekri/cef_fs',
            params: {
                path: '${globals.PATH}/',
                recursive: 'true',
                files: '*.SHP,*.shp',
            },
        },
        {
            id: 'b',
            gitid: 'ShapefileReader@mbenzekri/cef_gdal',
            params: {
                filename: 'filename',
                coordsys: 'EPSG:2154',
                encoding: 'UTF-8',
                filtered: false,
                x1bbox: null,
                y1bbox: null,
                x2bbox: null,
                y2bbox: null,
            },
        },
        {
            id: 'c',
            gitid: 'CoordProjector@mbenzekri/cef_proj4',
            params: {
                from: 'EPSG:2154',
                to: 'EPSG:4326',
            },
        },
        {
            id: 'd',
            gitid: 'ShapefileWriter@mbenzekri/cef_gdal',
            params: {
                filename: 'd:/data/cbe/commune.shp',
                coordsys: 'EPSG:2154',
                encoding: 'UTF-8',
                filtered: false,
                x1bbox: null,
                y1bbox: null,
                x2bbox: null,
                y2bbox: null,
            },
        },
    ],
};
const batch = new Batch(cebfile);
batch.run();
