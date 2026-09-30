// Isometric projection, so 3D shapes can be drawn as plain SVG polygons and
// stay sharp at any size. +x runs right and down, +y runs left and down, +z up.
var COS = Math.cos(Math.PI / 6)

export function project(x, y, z, scale, ox, oy) {
  return [ox + (x - y) * COS * scale, oy + (x + y) * 0.5 * scale - z * scale]
}

function pts(list) {
  return list.map(function(p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2) }).join(' ')
}

// The three faces of a box that face the viewer, as SVG `points` strings.
export function boxFaces(x, y, z, w, d, h, scale, ox, oy) {
  var P = function(a, b, c) { return project(a, b, c, scale, ox, oy) }
  return {
    top: pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]),
    left: pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]),
    right: pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)])
  }
}

// A four-sided pyramid (a roof): the two faces that face the viewer.
export function pyramidFaces(x, y, z, w, d, h, scale, ox, oy) {
  var P = function(a, b, c) { return project(a, b, c, scale, ox, oy) }
  var apex = P(x + w / 2, y + d / 2, z + h)
  return {
    left: pts([P(x, y + d, z), P(x + w, y + d, z), apex]),
    right: pts([P(x + w, y, z), P(x + w, y + d, z), apex])
  }
}
