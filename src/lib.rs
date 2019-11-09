mod utils;

use rand::seq::SliceRandom;
use wasm_bindgen::prelude::*;
use std::marker::Copy;

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
#[derive(Debug, Copy, Clone)]
pub struct Vector {
    pub x: f64,
    pub y: f64
}

#[wasm_bindgen]
impl Vector {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Vector {
        Vector { x, y }
    }
    pub fn subtract(&self, other: &Vector) -> Vector {
        Vector { x: self.x - other.x, y: self.y - other.y }
    }

    pub fn add(&self, other: &Vector) -> Vector {
        Vector { x: self.x + other.x, y: self.y + other.y }
    }

    pub fn scale_by(&self, number: f64) -> Vector {
        Vector { x: self.x * number, y: self.y * number }
    }

    pub fn length(&self) -> f64 {
        self.x.hypot(self.y)
    }

    pub fn normalize(&self) -> Vector {
        self.scale_by(1_f64 / self.length())
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

    pub fn length(&self) -> f64 {
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

struct Config {
    width: i32,
    height: i32,
    speed: f64,
    initial_snake_length: i32,
    initial_direction: Vector
}

enum Movement {
    TOP,
    RIGHT,
    DOWN,
    LEFT
}

static TOP:Vector = Vector { x: 0_f64, y: -1_f64 };
static RIGHT:Vector = Vector { x: 1_f64, y: 0_f64 };
static DOWN:Vector = Vector { x: 0_f64, y: 1_f64 };
static LEFT:Vector = Vector { x: -1_f64, y: 0_f64 };

static DEFAULT_CONFIG:Config = Config {
    width: 17,
    height: 15,
    speed: 0.006,
    initial_snake_length: 3,
    initial_direction: RIGHT 
};

fn get_segments_from_vectors(vectors: &Vec<Vector>) -> Vec<Segment> {
    let before_last = vectors.len() - 1;
    let mut segments:Vec<Segment> = Vec::new();
    for i in 0..before_last {
        segments.push(Segment::new(&vectors[i], &vectors[i + 1]));
    }
    segments
}

fn get_food(width: i32, height: i32, snake: &Vec<Vector>) -> Vector {
    let mut all_positions: Vec<Vector> = Vec::new();
    for x in 0..width {
        for y in 0..height {
            all_positions.push(Vector::new(f64::from(x) + 0.5, f64::from(y) + 0.5));
        }
    }
    let segments = get_segments_from_vectors(snake);
    let free_positions = all_positions
        .into_iter()
        .filter(|point| segments.iter().any(|segment| !segment.is_point_inside(point)))
        .collect::<Vec<Vector>>();

    let t = free_positions.choose(&mut rand::thread_rng());
    match t {
        None => free_positions[0],
        Some(p) => *p,
    }
}

fn get_new_tail(old_snake: &Vec<Vector>, initial_distance: f64) -> Vec<Vector> {
    let mut tail: Vec<Vector> = Vec::new();
    let mut distance = initial_distance;
    let end = old_snake.len() - 1;
    for i in 0..end {
        let point = old_snake[i];
        if tail.len() != 0 {
            tail.push(point);
        } else {
            let next = old_snake[i + 1];
            let segment = Segment::new(&point, &next);
            let length = segment.length();
            if length >= distance {
                let vector = segment.get_vector().normalize().scale_by(distance);
                distance = 0_f64;
                tail.push(point.add(&vector));
            } else {
                distance -= length;
            }
        }
    }
    tail
}

fn get_new_direction(old_direction: Vector, movement: Movement) -> Vector {
    let new_direction = match movement {
        Movement::TOP => TOP,
        Movement::RIGHT => RIGHT,
        Movement::DOWN => DOWN,
        Movement::LEFT => LEFT
    };
    if old_direction.is_opposite(&new_direction) {
        return old_direction
    }
    new_direction
}