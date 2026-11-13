// spray droplets: size in pixels from distance
attribute float aSize;attribute float aAlpha;uniform float uPx;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vA=aAlpha*mix(1.,smoothstep(1.5,9.,-mv.z),step(.3,aSize));gl_PointSize=min(aSize*uPx/max(-mv.z,.2),240.);gl_Position=projectionMatrix*mv;}
