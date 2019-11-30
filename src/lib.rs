mod utils;

use js_sys::Array;
use rand::Rng;
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

#[wasm_bindgen]
pub enum Movement {
    TOP,
    RIGHT,
    DOWN,
    LEFT
}

static TOP:Vector = Vector { x: 0_f64, y: -1_f64 };
static RIGHT:Vector = Vector { x: 1_f64, y: 0_f64 };
static DOWN:Vector = Vector { x: 0_f64, y: 1_f64 };
static LEFT:Vector = Vector { x: -1_f64, y: 0_f64 };

fn get_segments_from_vectors(vectors: &[Vector]) -> Vec<Segment> {
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
    let index = rand::thread_rng().gen_range(0, free_positions.len());
    free_positions[index]
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

#[wasm_bindgen]
pub struct Game {
    pub width: i32,
    pub height: i32,
    pub speed: f64,
    snake: Vec<Vector>,
    pub direction: Vector,
    pub food: Vector,
    pub score: i32
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new(
        width: i32,
        height: i32,
        speed: f64,
        snake_length: i32,
        direction: Vector
    ) -> Game {
        let head = Vector::new((f64::from(width) / 2_f64).round() - 0.5, (f64::from(height) / 2_f64).round() - 0.5);
        let tailtip = head.subtract(&direction.scale_by(f64::from(snake_length)));
        let mut snake: Vec<Vector> = Vec::new();
        snake.push(tailtip);
        snake.push(head);
        let food = get_food(width, height, &snake);
        Game {
            width: width,
            height: height,
            speed: speed,
            snake: snake,
            direction: direction,
            food: food,
            score: 0
        }
    }
    fn process_movement(&mut self, movement: Movement, distance: f64) {
        let new_tail = get_new_tail(&self.snake, distance);
        let old_head = self.snake.last().unwrap();
        let new_head = old_head.add(&self.direction.scale_by(distance));
        let new_direction = get_new_direction(self.direction, movement);
        if !self.direction.equal_to(&new_direction) {
            let old_x = old_head.x;
            let old_y = old_head.y;
            let old_x_rounded = old_x.round();
            let old_y_rounded = old_y.round();
            let new_x_rounded = new_head.x.round();
            let new_y_rounded = new_head.y.round();

            let rounded_x_changed = old_x_rounded != new_x_rounded;
            let rounded_y_changed = old_y_rounded != new_y_rounded;
            
            if rounded_x_changed || rounded_y_changed {
                let old = if rounded_x_changed { old_x } else { old_y };
                let old_rounded = if rounded_x_changed { old_x_rounded } else { old_y_rounded };
                let new_rounded = if rounded_x_changed { new_x_rounded } else { new_y_rounded };
                let breakpoint_component = old_rounded + (if new_rounded > old_rounded { 0.5_f64 } else { -0.5_f64 });
                let breakpoint = if rounded_x_changed { Vector::new(breakpoint_component, old_y) } else { Vector::new(old_x, breakpoint_component) };
                let vector = new_direction.scale_by(distance - (old - breakpoint_component).abs());
                let head = breakpoint.add(&vector);

                self.direction = new_direction;
                let mut new_snake: Vec<Vector> = new_tail.clone();
                new_snake.push(breakpoint);
                new_snake.push(head);
                self.snake = new_snake;
            }
        }
        let mut new_snake: Vec<Vector> = new_tail.clone();
        new_snake.push(new_head);
        self.snake = new_snake;
    }
    
    fn process_food(&mut self) {
        let head_segment = Segment::new(
            &self.snake[self.snake.len() - 2],
            &self.snake[self.snake.len() - 1]
        );
        if head_segment.is_point_inside(&self.food) {
            let tail_end = self.snake[0];
            let before_tail_end = self.snake[1];
            let tail_segment = Segment::new(&before_tail_end, &tail_end);
            let new_tail_end = tail_end.add(&tail_segment.get_vector().normalize());
            self.snake[0] = new_tail_end;
            self.food = get_food(self.width, self.height, &self.snake);
            self.score += 1;
        }
    }

    pub fn is_game_over(&self) -> bool {
        let last = self.snake.last().unwrap();
        if last.x < 0_f64 || last.x > f64::from(self.width) || last.y < 0_f64  || last.y > f64::from(self.height) {
            return true
        }
        if self.snake.len() < 5 {
            return false
        }

        let points_for_segments = &self.snake[..self.snake.len() - 3];
        let segments = get_segments_from_vectors(points_for_segments);
        for segment in segments {
            let projected = segment.get_projected_point(&last);
            if segment.is_point_inside(&projected) {
                let distance = Segment::new(&last, &projected).length();
                if distance < 0.5 {
                    return true
                }
            }
        }
        return false
    }

    pub fn process(&mut self, movement: Movement, timespan: f64) {
        let distance = self.speed * timespan;
        self.process_movement(movement, distance);
        self.process_food();
    }

    pub fn get_snake(&self) -> Array {
        self.snake.clone().into_iter().map(JsValue::from).collect()
    }
}