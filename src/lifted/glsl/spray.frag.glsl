// spray droplets: soft round sprites
uniform vec3 uCol;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.08,.5,d))*vA;if(a<.004)discard;gl_FragColor=vec4(uCol,a);}
