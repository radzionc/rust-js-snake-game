mod utils;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, wasm-snake-game!");
}

#[wasm_bindgen]
pub struct Vector {
    pub x: f32,
    pub y: f32
}

#[wasm_bindgen]
impl Vector {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32) -> Vector {
        Vector { x, y }
    }
    pub fn subtract(&self, other: &Vector) -> Vector {
        Vector { x: self.x - other.x, y: self.y - other.y }
    }

    pub fn add(&self, other: &Vector) -> Vector {
        Vector { x: self.x + other.x, y: self.y + other.y }
    }

    pub fn scale_by(&self, number: f32) -> Vector {
        Vector { x: self.x * number, y: self.y * number }
    }

    pub fn length(&self) -> f32 {
        self.x.hypot(self.y)
    }

    pub fn normalize(&self) -> Vector {
        self.scale_by(1_f32 / self.length())
    }

    pub fn is_opposite(&self, other: &Vector) -> bool {
        let sum = self.add(other);
        self.x == sum.x && self.y == sum.y
    }

    pub fn equal_to(&self, other: &Vector) -> bool {
        self.x == other.x && self.y == other.y
    }
}

pub struct Segment<'a> {
    pub start: &'a Vector,
    pub end: &'a Vector
}

impl<'a> Segment<'a> {
    pub fn new(start: &'a Vector, end: &'a Vector) -> Segment<'a> {
        Segment { start, end }
    }

    pub fn get_vector(&self) -> Vector {
        self.end.subtract(&self.start)
    }

    pub fn length(&self) -> f32 {
        self.get_vector().length()
    }

    pub fn is_point_inside(&self, point: &Vector) -> bool {
        let first = Segment::new(self.start, point);
        let second = Segment::new(point, self.end);
        self.length() == first.length() + second.length()
    }

    pub fn get_projected_point(&self, point: &Vector) -> Vector {
        let vector = self.get_vector();
        let u = ((point.x - self.start.x) * vector.x + (point.y - self.start.y) * vector.y) / (vector.x * vector.x + vector.y * vector.y);
        Vector::new(self.start.x + u * vector.x, self.start.y + u * vector.y)
    }
}