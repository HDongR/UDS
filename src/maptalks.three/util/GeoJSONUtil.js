/* eslint-disable indent */
import { default as Coordinate} from '../../geo/Coordinate';
const TYPES = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
function getGeoJSONType(feature) {
    return feature.geometry ? feature.geometry.type : null;
}
export function isGeoJSON(feature) {
    const type = getGeoJSONType(feature);
    if (type) {
        for (let i = 0, len = TYPES.length; i < len; i++) {
            if (TYPES[i] === type) {
                return true;
            }
        }
    }
    return false;
}
export function isGeoJSONPolygon(feature) {
    const type = getGeoJSONType(feature);
    if (type && (type === TYPES[4] || type === TYPES[5])) {
        return true;
    }
    return false;
}
export function isGeoJSONLine(feature) {
    const type = getGeoJSONType(feature);
    if (type && (type === TYPES[2] || type === TYPES[3])) {
        return true;
    }
    return false;
}
export function isGeoJSONPoint(feature) {
    const type = getGeoJSONType(feature);
    if (type && (type === TYPES[0] || type === TYPES[1])) {
        return true;
    }
    return false;
}
export function isGeoJSONMulti(feature) {
    const type = getGeoJSONType(feature);
    if (type) {
        if (type.indexOf('Multi') > -1) {
            return true;
        }
    }
    return false;
}
export function getGeoJSONCoordinates(feature) {
    return feature.geometry ? feature.geometry.coordinates : [];
}
export function getGeoJSONCenter(feature, out) {
    const type = getGeoJSONType(feature);
    if (!type || !feature.geometry) {
        return null;
    }
    const geometry = feature.geometry;
    const coordinates = geometry.coordinates;
    if (!coordinates) {
        return null;
    }
    // const coords: Array<Array<number>> = [];
    let sumX = 0, sumY = 0, coordLen = 0;
    switch (type) {
        case 'Point': {
            sumX = coordinates[0];
            sumY = coordinates[1];
            // coords.push(coordinates as Array<number>);
            coordLen++;
            break;
        }
        case 'MultiPoint':
        case 'LineString': {
            for (let i = 0, len = coordinates.length; i < len; i++) {
                sumX += coordinates[i][0];
                sumY += coordinates[i][1];
                coordLen++;
                // coords.push(coordinates[i] as Array<number>);
            }
            break;
        }
        case 'MultiLineString':
        case 'Polygon': {
            for (let i = 0, len = coordinates.length; i < len; i++) {
                for (let j = 0, len1 = coordinates[i].length; j < len1; j++) {
                    // coords.push((coordinates[i] as Array<Array<number>>)[j]);
                    sumX += coordinates[i][j][0];
                    sumY += coordinates[i][j][1];
                    coordLen++;
                }
            }
            break;
        }
        case 'MultiPolygon': {
            for (let i = 0, len = coordinates.length; i < len; i++) {
                for (let j = 0, len1 = coordinates[i].length; j < len1; j++) {
                    for (let m = 0, len2 = coordinates[i][j].length; m < len2; m++) {
                        // coords.push(((coordinates[i] as Array<Array<Array<number>>>)[j])[m]);
                        sumX += coordinates[i][j][m][0];
                        sumY += coordinates[i][j][m][1];
                        coordLen++;
                    }
                }
            }
            break;
        }
    }
    const x = sumX / coordLen, y = sumY / coordLen;
    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return new Coordinate(x, y);
}
export function spliteGeoJSONMulti(feature) {
    const type = getGeoJSONType(feature);
    if (!type || !feature.geometry) {
        return null;
    }
    const geometry = feature.geometry;
    const properties = feature.properties || {};
    const coordinates = geometry.coordinates;
    if (!coordinates) {
        return null;
    }
    const features = [];
    let fType;
    switch (type) {
        case 'MultiPoint': {
            fType = 'Point';
            break;
        }
        case 'MultiLineString': {
            fType = 'LineString';
            break;
        }
        case 'MultiPolygon': {
            fType = 'Polygon';
            break;
        }
    }
    if (fType) {
        for (let i = 0, len = coordinates.length; i < len; i++) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: fType,
                    coordinates: coordinates[i]
                },
                properties
            });
        }
    }
    else {
        features.push(feature);
    }
    return features;
}